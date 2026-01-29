<?php
/**
 * Search Results Template
 */
get_header();
?>

<header class="page-header" style="margin-bottom: 2rem;">
    <h1 class="page-title">
        Search Results: "<?php echo esc_html(get_search_query()); ?>"
    </h1>
    <p class="text-muted">
        <?php
        global $wp_query;
        printf('// %d result(s) found', $wp_query->found_posts);
        ?>
    </p>
</header>

<?php if (have_posts()) : ?>

    <?php while (have_posts()) : the_post(); ?>

        <article id="post-<?php the_ID(); ?>" <?php post_class(); ?>>
            <header class="entry-header">
                <span class="post-type-label text-muted" style="font-size: 0.75rem; text-transform: uppercase;">
                    <?php echo get_post_type_object(get_post_type())->labels->singular_name; ?>
                </span>
                <h2 class="entry-title">
                    <a href="<?php the_permalink(); ?>"><?php the_title(); ?></a>
                </h2>

                <div class="entry-meta">
                    <span class="posted-on"><?php echo get_the_date('Y-m-d'); ?></span>
                </div>
            </header>

            <div class="entry-content">
                <?php the_excerpt(); ?>
            </div>

            <a href="<?php the_permalink(); ?>" class="read-more">[ View ]</a>
        </article>

    <?php endwhile; ?>

    <nav class="pagination">
        <?php
        echo paginate_links(array(
            'prev_text' => '&laquo; Prev',
            'next_text' => 'Next &raquo;',
        ));
        ?>
    </nav>

<?php else : ?>

    <article class="post no-results">
        <header class="entry-header">
            <h2 class="entry-title">No Results Found</h2>
        </header>
        <div class="entry-content">
            <p>No content matched your search query. Try different keywords.</p>

            <div style="margin-top: 2rem;">
                <?php get_search_form(); ?>
            </div>

            <div style="margin-top: 2rem;">
                <h3>Suggestions:</h3>
                <ul style="list-style: none;">
                    <li>> Check your spelling</li>
                    <li>> Try more general keywords</li>
                    <li>> Try different keywords</li>
                    <li>> <a href="<?php echo esc_url(home_url('/directory/')); ?>">Browse the directory</a></li>
                </ul>
            </div>
        </div>
    </article>

<?php endif; ?>

<?php get_footer(); ?>
