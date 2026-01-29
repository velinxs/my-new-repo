<?php get_header(); ?>

<?php if (have_posts()) : ?>

    <?php if (is_home() && !is_front_page()) : ?>
        <header class="page-header">
            <h1 class="page-title">Blog</h1>
        </header>
    <?php endif; ?>

    <?php while (have_posts()) : the_post(); ?>

        <article id="post-<?php the_ID(); ?>" <?php post_class(); ?>>
            <header class="entry-header">
                <?php if (is_singular()) : ?>
                    <h1 class="entry-title"><?php the_title(); ?></h1>
                <?php else : ?>
                    <h2 class="entry-title">
                        <a href="<?php the_permalink(); ?>"><?php the_title(); ?></a>
                    </h2>
                <?php endif; ?>

                <div class="entry-meta">
                    <span class="posted-on"><?php echo get_the_date('Y-m-d H:i'); ?></span>
                    <span class="posted-by"><?php the_author(); ?></span>
                    <?php if (has_category()) : ?>
                        <span class="posted-in"><?php the_category(', '); ?></span>
                    <?php endif; ?>
                </div>
            </header>

            <div class="entry-content">
                <?php
                if (is_singular()) :
                    the_content();
                else :
                    the_excerpt();
                endif;
                ?>
            </div>

            <?php if (!is_singular()) : ?>
                <a href="<?php the_permalink(); ?>" class="read-more">[ Read More ]</a>
            <?php endif; ?>

            <?php if (is_singular()) : ?>
                <footer class="entry-footer">
                    <?php if (has_tag()) : ?>
                        <span class="tags">Tags: <?php the_tags('', ', '); ?></span>
                    <?php endif; ?>
                </footer>
            <?php endif; ?>
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
            <p>No content found. Perhaps try a search?</p>
            <?php get_search_form(); ?>
        </div>
    </article>

<?php endif; ?>

<?php get_footer(); ?>
