<?php get_header(); ?>

<?php while (have_posts()) : the_post(); ?>

    <article id="post-<?php the_ID(); ?>" <?php post_class(); ?>>
        <header class="entry-header">
            <h1 class="entry-title"><?php the_title(); ?></h1>

            <div class="entry-meta">
                <span class="posted-on"><?php echo get_the_date('Y-m-d H:i'); ?></span>
                <span class="posted-by"><?php the_author(); ?></span>
                <?php if (has_category()) : ?>
                    <span class="posted-in"><?php the_category(', '); ?></span>
                <?php endif; ?>
            </div>
        </header>

        <div class="entry-content">
            <?php the_content(); ?>

            <?php
            wp_link_pages(array(
                'before' => '<nav class="pagination">',
                'after'  => '</nav>',
            ));
            ?>
        </div>

        <footer class="entry-footer">
            <?php if (has_tag()) : ?>
                <span class="tags">Tags: <?php the_tags('', ', '); ?></span>
            <?php endif; ?>
        </footer>
    </article>

    <nav class="post-navigation" style="margin: 2rem 0;">
        <div style="display: flex; justify-content: space-between; gap: 1rem;">
            <div class="nav-previous">
                <?php previous_post_link('%link', '&laquo; %title'); ?>
            </div>
            <div class="nav-next">
                <?php next_post_link('%link', '%title &raquo;'); ?>
            </div>
        </div>
    </nav>

    <?php
    if (comments_open() || get_comments_number()) :
        comments_template();
    endif;
    ?>

<?php endwhile; ?>

<?php get_footer(); ?>
