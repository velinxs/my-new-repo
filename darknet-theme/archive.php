<?php get_header(); ?>

<header class="page-header" style="margin-bottom: 2rem;">
    <?php
    the_archive_title('<h1 class="page-title">', '</h1>');
    the_archive_description('<div class="archive-description">', '</div>');
    ?>
</header>

<?php if (have_posts()) : ?>

    <?php while (have_posts()) : the_post(); ?>

        <article id="post-<?php the_ID(); ?>" <?php post_class(); ?>>
            <header class="entry-header">
                <h2 class="entry-title">
                    <a href="<?php the_permalink(); ?>"><?php the_title(); ?></a>
                </h2>

                <div class="entry-meta">
                    <span class="posted-on"><?php echo get_the_date('Y-m-d'); ?></span>
                    <span class="posted-by"><?php the_author(); ?></span>
                </div>
            </header>

            <div class="entry-content">
                <?php the_excerpt(); ?>
            </div>

            <a href="<?php the_permalink(); ?>" class="read-more">[ Read More ]</a>
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
            <h1 class="entry-title">Nothing Found</h1>
        </header>
        <div class="entry-content">
            <p>No posts found in this archive.</p>
        </div>
    </article>

<?php endif; ?>

<?php get_footer(); ?>
